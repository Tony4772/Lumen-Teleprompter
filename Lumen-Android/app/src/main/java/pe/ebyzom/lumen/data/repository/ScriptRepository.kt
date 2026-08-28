package pe.ebyzom.lumen.data.repository

import kotlinx.coroutines.flow.Flow
import pe.ebyzom.lumen.data.local.ScriptDao
import pe.ebyzom.lumen.model.Script

class ScriptRepository(private val scriptDao: ScriptDao) {
    val allScripts: Flow<List<Script>> = scriptDao.getAllScripts()

    suspend fun getScriptById(id: Long): Script? = scriptDao.getScriptById(id)

    suspend fun insertScript(script: Script) = scriptDao.insertScript(script)

    suspend fun updateScript(script: Script) = scriptDao.updateScript(script)

    suspend fun deleteScript(script: Script) = scriptDao.deleteScript(script)
}
