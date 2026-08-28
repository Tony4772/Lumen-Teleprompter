package pe.ebyzom.lumen.data.repository;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00002\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0010 \n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\u0002\n\u0002\b\u0004\n\u0002\u0010\t\n\u0002\b\u0004\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0019\u0010\u000b\u001a\u00020\f2\u0006\u0010\r\u001a\u00020\bH\u0086@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\u000eJ\u001b\u0010\u000f\u001a\u0004\u0018\u00010\b2\u0006\u0010\u0010\u001a\u00020\u0011H\u0086@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\u0012J\u0019\u0010\u0013\u001a\u00020\f2\u0006\u0010\r\u001a\u00020\bH\u0086@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\u000eJ\u0019\u0010\u0014\u001a\u00020\f2\u0006\u0010\r\u001a\u00020\bH\u0086@\u00f8\u0001\u0000\u00a2\u0006\u0002\u0010\u000eR\u001d\u0010\u0005\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\b0\u00070\u0006\u00a2\u0006\b\n\u0000\u001a\u0004\b\t\u0010\nR\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u0082\u0002\u0004\n\u0002\b\u0019\u00a8\u0006\u0015"}, d2 = {"Lpe/ebyzom/lumen/data/repository/ScriptRepository;", "", "scriptDao", "Lpe/ebyzom/lumen/data/local/ScriptDao;", "(Lpe/ebyzom/lumen/data/local/ScriptDao;)V", "allScripts", "Lkotlinx/coroutines/flow/Flow;", "", "Lpe/ebyzom/lumen/model/Script;", "getAllScripts", "()Lkotlinx/coroutines/flow/Flow;", "deleteScript", "", "script", "(Lpe/ebyzom/lumen/model/Script;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getScriptById", "id", "", "(JLkotlin/coroutines/Continuation;)Ljava/lang/Object;", "insertScript", "updateScript", "app_debug"})
public final class ScriptRepository {
    @org.jetbrains.annotations.NotNull
    private final pe.ebyzom.lumen.data.local.ScriptDao scriptDao = null;
    @org.jetbrains.annotations.NotNull
    private final kotlinx.coroutines.flow.Flow<java.util.List<pe.ebyzom.lumen.model.Script>> allScripts = null;
    
    public ScriptRepository(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.data.local.ScriptDao scriptDao) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull
    public final kotlinx.coroutines.flow.Flow<java.util.List<pe.ebyzom.lumen.model.Script>> getAllScripts() {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable
    public final java.lang.Object getScriptById(long id, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super pe.ebyzom.lumen.model.Script> $completion) {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable
    public final java.lang.Object insertScript(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.model.Script script, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion) {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable
    public final java.lang.Object updateScript(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.model.Script script, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion) {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable
    public final java.lang.Object deleteScript(@org.jetbrains.annotations.NotNull
    pe.ebyzom.lumen.model.Script script, @org.jetbrains.annotations.NotNull
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion) {
        return null;
    }
}